from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    deals = relationship("Deal", back_populates="organization")
    contacts = relationship("Contact", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    # BUG: role stored with inconsistent casing in seed data ("Admin" vs "admin")
    role = Column(String(50), nullable=False, default="rep")
    org_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    # BUG: is_active field exists but is never checked during authentication
    is_active = Column(Integer, default=1)

    organization = relationship("Organization", back_populates="users")
    assigned_deals = relationship("Deal", back_populates="assigned_user", foreign_keys="Deal.assigned_to")
    activities = relationship("Activity", back_populates="user")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    org_id = Column(Integer, ForeignKey("organizations.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="contacts")
    deals = relationship("Deal", back_populates="contact")
    activities = relationship("Activity", back_populates="contact")


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    # BUG: no constraint preventing negative values
    value = Column(Float, nullable=False, default=0)
    stage = Column(String(50), nullable=False, default="lead")
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"))
    org_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    # BUG: updated_at uses datetime.utcnow (called once at class definition time)
    # instead of datetime.utcnow (called each time) for onupdate
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expected_close_date = Column(String(50))
    notes = Column(Text, default="")
    # BUG: priority is stored as string but compared numerically in sorting
    priority = Column(String(10), default="3")

    organization = relationship("Organization", back_populates="deals")
    contact = relationship("Contact", back_populates="deals")
    assigned_user = relationship("User", back_populates="assigned_deals", foreign_keys=[assigned_to])
    activities = relationship("Activity", back_populates="deal")
    stage_history = relationship("StageHistory", back_populates="deal")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    # BUG: created_at stored as naive datetime (no timezone info)
    created_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="activities")
    contact = relationship("Contact", back_populates="activities")
    user = relationship("User", back_populates="activities")


class StageHistory(Base):
    __tablename__ = "stage_history"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    from_stage = Column(String(50))
    to_stage = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime, default=datetime.utcnow)

    deal = relationship("Deal", back_populates="stage_history")
