# backend/app/schemas/subscription.py
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class SubscriptionBase(BaseModel):
    user_id: str
    plan_id: str # e.g., "free", "premium_monthly", "premium_yearly"
    status: Literal["active", "inactive", "cancelled", "past_due", "trialing"] = "inactive"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    user_id: str
    plan_id: str # Plan ID from Stripe or your system
    # Stripe payment method ID or token might be passed here from frontend
    payment_method_id: Optional[str] = None 

class SubscriptionUpdate(BaseModel):
    status: Optional[Literal["active", "inactive", "cancelled", "past_due"]] = None
    plan_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None

class SubscriptionInDB(SubscriptionBase):
    id: str # Subscription ID from Stripe or your system
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        orm_mode = True
        from_attributes = True

class Subscription(SubscriptionInDB):
    pass

# For Stripe Webhook event data (simplified)
class StripeWebhookEvent(BaseModel):
    id: str
    type: str # e.g., "checkout.session.completed", "invoice.payment_succeeded", "customer.subscription.deleted"
    data: dict

