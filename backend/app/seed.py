from datetime import datetime, timedelta
import random
from app.database import SessionLocal, engine, Base
from app.models import Organization, User, Contact, Deal, Activity, StageHistory
from app.auth import hash_password


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Organization).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    # Organizations
    org1 = Organization(name="Acme Corp")
    org2 = Organization(name="Globex Industries")
    db.add_all([org1, org2])
    db.commit()
    db.refresh(org1)
    db.refresh(org2)

    # Users — BUG: role casing inconsistent ("Admin" vs "admin" expected by auth checks)
    users = [
        User(email="admin@acme.com", password_hash=hash_password("admin123"),
             name="Alice Admin", role="Admin", org_id=org1.id),
        User(email="manager@acme.com", password_hash=hash_password("manager123"),
             name="Bob Manager", role="Manager", org_id=org1.id),
        User(email="rep1@acme.com", password_hash=hash_password("rep123"),
             name="Charlie Rep", role="rep", org_id=org1.id),
        User(email="rep2@acme.com", password_hash=hash_password("rep123"),
             name="Diana Rep", role="rep", org_id=org1.id),
        # BUG: this user is_active=0 but can still log in (auth doesn't check)
        User(email="inactive@acme.com", password_hash=hash_password("inactive123"),
             name="Eve Inactive", role="rep", org_id=org1.id, is_active=0),
        # Different org users
        User(email="admin@globex.com", password_hash=hash_password("admin123"),
             name="Frank Admin", role="Admin", org_id=org2.id),
        User(email="rep@globex.com", password_hash=hash_password("rep123"),
             name="Grace Rep", role="rep", org_id=org2.id),
    ]
    db.add_all(users)
    db.commit()
    for u in users:
        db.refresh(u)

    # Contacts
    companies = ["TechStart Inc", "DataFlow Systems", "CloudNine Solutions",
                 "QuantumLeap AI", "NexGen Robotics", "SkyBridge Networks",
                 "CoreLogic Analytics", "PrimePath Software", "Elevate Digital",
                 "SwiftScale Corp"]

    contacts = []
    for i, company in enumerate(companies):
        org = org1 if i < 7 else org2
        contact = Contact(
            name=f"Contact Person {i+1}",
            email=f"contact{i+1}@{company.lower().replace(' ', '')}.com",
            phone=f"555-{100+i:04d}",
            company=company,
            org_id=org.id,
            created_by=users[0].id if org == org1 else users[5].id,
        )
        contacts.append(contact)
    db.add_all(contacts)
    db.commit()
    for c in contacts:
        db.refresh(c)

    # Deals
    stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    deal_titles = [
        "Enterprise License Agreement", "Cloud Migration Project",
        "Annual Support Contract", "Custom Integration Package",
        "Data Analytics Platform", "Security Audit Service",
        "Mobile App Development", "API Gateway License",
        "Consulting Engagement Q4", "Infrastructure Upgrade",
        "Training Program", "Proof of Concept",
        "Expansion Deal - East", "Renewal - Premium Tier",
        "New Market Entry", "Partnership Agreement",
        "Platform Migration", "Compliance Suite",
        "Performance Optimization", "Managed Services Contract",
    ]

    acme_reps = [u for u in users if u.org_id == org1.id and u.role == "rep"]
    globex_reps = [u for u in users if u.org_id == org2.id and u.role == "rep"]

    deals = []
    for i, title in enumerate(deal_titles):
        if i < 15:
            org = org1
            rep = acme_reps[i % len(acme_reps)]
            contact = contacts[i % 7]
        else:
            org = org2
            rep = globex_reps[0] if globex_reps else users[5]
            contact = contacts[7 + (i % 3)]

        stage = stages[i % len(stages)]
        # BUG: some deal values are negative
        value = [50000, 125000, 75000, 200000, 30000, -15000, 180000,
                 95000, 45000, 300000, 15000, 60000, 250000, 85000,
                 110000, 40000, 175000, 55000, 90000, 220000][i]

        days_ago = random.randint(1, 90)
        deal = Deal(
            title=title,
            value=value,
            stage=stage,
            contact_id=contact.id,
            assigned_to=rep.id,
            org_id=org.id,
            created_at=datetime.utcnow() - timedelta(days=days_ago),
            expected_close_date=str((datetime.utcnow() + timedelta(days=random.randint(7, 120))).date()),
            notes=f"Notes for {title}. Contact person is {contact.name}.",
            priority=str(random.randint(1, 5)),
        )
        deals.append(deal)
    db.add_all(deals)
    db.commit()
    for d in deals:
        db.refresh(d)

    # Stage history
    for deal in deals:
        current_stage_idx = stages.index(deal.stage)
        for j in range(current_stage_idx + 1):
            history = StageHistory(
                deal_id=deal.id,
                from_stage=stages[j - 1] if j > 0 else None,
                to_stage=stages[j],
                changed_by=deal.assigned_to,
                changed_at=deal.created_at + timedelta(days=j * 3),
            )
            db.add(history)
    db.commit()

    # Activities
    activity_types = ["call", "email", "meeting", "note", "task"]
    activity_templates = [
        "Initial discovery call with {contact}",
        "Sent proposal to {contact}",
        "Follow-up meeting scheduled with {contact}",
        "Left voicemail for {contact}",
        "Demo scheduled for {deal}",
        "Contract review for {deal}",
        "Pricing discussion for {deal}",
        "Sent follow-up email regarding {deal}",
        "Internal review meeting for {deal}",
        "Updated deal notes for {deal}",
    ]

    for deal in deals[:15]:
        num_activities = random.randint(2, 6)
        for k in range(num_activities):
            template = random.choice(activity_templates)
            description = template.format(
                contact=deal.contact.name if deal.contact else "contact",
                deal=deal.title,
            )
            activity = Activity(
                type=random.choice(activity_types),
                description=description,
                deal_id=deal.id,
                contact_id=deal.contact_id,
                user_id=deal.assigned_to,
                created_at=deal.created_at + timedelta(days=random.randint(0, 30)),
            )
            db.add(activity)
    db.commit()

    db.close()
    print("Database seeded successfully!")


if __name__ == "__main__":
    seed_database()
