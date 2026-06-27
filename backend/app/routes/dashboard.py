from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Deal, Activity, StageHistory, Contact, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no org_id filter — counts deals across ALL organizations
    total_deals = db.query(Deal).count()
    total_contacts = db.query(Contact).count()

    # BUG: counts closed_won deals' value but also includes closed_lost deals
    # because the filter only checks for 'closed' prefix
    won_revenue = (
        db.query(func.sum(Deal.value))
        .filter(Deal.stage.like("closed%"))
        .scalar()
    ) or 0

    pipeline_value = (
        db.query(func.sum(Deal.value))
        .filter(Deal.stage.notin_(["closed_won", "closed_lost"]))
        .scalar()
    ) or 0

    deals_by_stage = {}
    for stage in ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]:
        count = db.query(Deal).filter(Deal.stage == stage).count()
        value = db.query(func.sum(Deal.value)).filter(Deal.stage == stage).scalar() or 0
        deals_by_stage[stage] = {"count": count, "value": value}

    # BUG: "recent" activities are from last 7 days, but the datetime comparison
    # might not work correctly across timezones
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_activity_count = (
        db.query(Activity)
        .filter(Activity.created_at >= seven_days_ago)
        .count()
    )

    return {
        "total_deals": total_deals,
        "total_contacts": total_contacts,
        "won_revenue": won_revenue,
        "pipeline_value": pipeline_value,
        "deals_by_stage": deals_by_stage,
        "recent_activity_count": recent_activity_count,
    }


@router.get("/pipeline")
def get_pipeline_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]

    pipeline = []
    for stage in stages:
        deals = db.query(Deal).filter(Deal.stage == stage).all()
        stage_data = {
            "stage": stage,
            "count": len(deals),
            "total_value": sum(d.value for d in deals),
            # BUG: average calculated incorrectly — divides by total deals count, not stage count
            "avg_value": sum(d.value for d in deals) / max(db.query(Deal).count(), 1),
            "deals": [
                {
                    "id": d.id,
                    "title": d.title,
                    "value": d.value,
                    "assigned_to": d.assigned_to,
                    "assigned_user_name": d.assigned_user.name if d.assigned_user else None,
                }
                for d in deals
            ],
        }
        pipeline.append(stage_data)

    return pipeline


@router.get("/performance")
def get_user_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG: no org_id filter — shows users from all orgs
    users = db.query(User).all()

    performance = []
    for user in users:
        total_deals = db.query(Deal).filter(Deal.assigned_to == user.id).count()
        won_deals = (
            db.query(Deal)
            .filter(Deal.assigned_to == user.id, Deal.stage == "closed_won")
            .count()
        )
        lost_deals = (
            db.query(Deal)
            .filter(Deal.assigned_to == user.id, Deal.stage == "closed_lost")
            .count()
        )
        total_revenue = (
            db.query(func.sum(Deal.value))
            .filter(Deal.assigned_to == user.id, Deal.stage == "closed_won")
            .scalar()
        ) or 0

        # BUG: win rate calculation — divides by total_deals (includes open deals)
        # instead of (won_deals + lost_deals) which would be the actual conversion rate
        win_rate = (won_deals / total_deals * 100) if total_deals > 0 else 0

        activity_count = db.query(Activity).filter(Activity.user_id == user.id).count()

        performance.append({
            "user_id": user.id,
            "user_name": user.name,
            "role": user.role,
            "total_deals": total_deals,
            "won_deals": won_deals,
            "lost_deals": lost_deals,
            "total_revenue": total_revenue,
            "win_rate": round(win_rate, 1),
            "activity_count": activity_count,
        })

    # BUG: sorts by total_revenue but the field is a number,
    # yet the sort comparison could fail for None values
    performance.sort(key=lambda x: x["total_revenue"], reverse=True)

    return performance


@router.get("/conversion")
def get_conversion_funnel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stages = ["lead", "qualified", "proposal", "negotiation", "closed_won"]

    # BUG: This counts current deals in each stage, NOT deals that passed through each stage
    # A real funnel should count deals that were ever in each stage (via stage_history)
    funnel = []
    for i, stage in enumerate(stages):
        count = db.query(Deal).filter(Deal.stage == stage).count()
        value = db.query(func.sum(Deal.value)).filter(Deal.stage == stage).scalar() or 0

        prev_count = funnel[i - 1]["count"] if i > 0 else count
        conversion_rate = (count / prev_count * 100) if prev_count > 0 else 0

        funnel.append({
            "stage": stage,
            "count": count,
            "value": value,
            "conversion_rate": round(conversion_rate, 1),
        })

    return funnel
