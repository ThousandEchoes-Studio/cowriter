# backend/app/api/v1/endpoints/billing.py
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from typing import Any

from app.api.deps import get_current_active_user
from app.schemas.user import User
from app.schemas.subscription import SubscriptionCreate, Subscription, StripeWebhookEvent # Assuming these are defined

# In a real app, you would import and use the Stripe library
# import stripe
# from app.core.config import settings
# stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

# Placeholder for a list of available plans (could be fetched from DB or config)
PLANS = {
    "free": {"name": "Free Tier", "price": 0, "features": ["Basic voice-to-MIDI", "Limited sample uploads"]},
    "premium_monthly": {"name": "Premium Monthly", "price": 1500, "stripe_price_id": "price_xxxxxxxxxxxxxx", "features": ["Unlimited voice-to-MIDI", "Unlimited sample uploads", "Collaboration mode"]}
}

@router.post("/create-checkout-session/", response_model=dict, summary="Create a Stripe Checkout Session for Subscription")
async def create_checkout_session(
    plan_id: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """
    Creates a Stripe Checkout session for the user to subscribe to a selected plan.
    - **plan_id**: The ID of the plan the user wants to subscribe to (e.g., "premium_monthly").
    - Requires authentication.
    """
    user_id = current_user.id
    if plan_id not in PLANS or plan_id == "free":
        raise HTTPException(status_code=400, detail="Invalid or free plan ID for checkout.")

    selected_plan = PLANS[plan_id]
    stripe_price_id = selected_plan.get("stripe_price_id")

    if not stripe_price_id:
        raise HTTPException(status_code=500, detail=f"Stripe Price ID not configured for plan: {plan_id}")

    # In a real implementation with Stripe:
    # try:
    #     checkout_session = stripe.checkout.Session.create(
    #         success_url="YOUR_SUCCESS_URL", # e.g., https://yourapp.com/subscribe/success?session_id={CHECKOUT_SESSION_ID}
    #         cancel_url="YOUR_CANCEL_URL",   # e.g., https://yourapp.com/subscribe/cancel
    #         payment_method_types=["card"],
    #         mode="subscription",
    #         client_reference_id=user_id, # Link session to your user ID
    #         line_items=[
    #             {
    #                 "price": stripe_price_id,
    #                 "quantity": 1,
    #             }
    #         ],
    #         # To prefill email or link to existing Stripe customer:
    #         # customer_email=current_user.email, 
    #         # customer=stripe_customer_id_if_exists, 
    #     )
    #     return {"sessionId": checkout_session.id, "publishableKey": settings.STRIPE_PUBLISHABLE_KEY}
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=str(e))

    # Placeholder response for prototype
    print(f"User {user_id} attempting to create checkout session for plan {plan_id} (Stripe Price ID: {stripe_price_id})")
    return {
        "sessionId": f"cs_test_placeholder_{user_id}_{plan_id}",
        "message": "Stripe Checkout session created (placeholder). Integrate with Stripe SDK on frontend.",
        "publishableKey": "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" # Placeholder Stripe publishable key
    }

@router.get("/subscription-status/", response_model=Subscription, summary="Get User Subscription Status")
async def get_subscription_status(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the current subscription status for the authenticated user.
    - Requires authentication.
    """
    user_id = current_user.id
    # In a real app, fetch this from your database where you store subscription info
    # For prototype, return a placeholder or a default free plan status
    print(f"Fetching subscription status for user {user_id}")
    # Example: Default to free plan if no subscription found
    return Subscription(
        id=f"sub_placeholder_{user_id}",
        user_id=user_id,
        plan_id="free",
        status="active", # Free plan is always 'active'
        current_period_start=None,
        current_period_end=None,
        stripe_subscription_id=None,
        stripe_customer_id=None
    )

@router.post("/stripe-webhook/", summary="Handle Stripe Webhook Events")
async def stripe_webhook(
    request: Request, 
    event_payload: StripeWebhookEvent = Body(...)
):
    """
    Handles incoming webhook events from Stripe to update subscription statuses, etc.
    This endpoint should be protected by verifying the Stripe signature (not implemented in placeholder).
    """
    # In a real implementation:
    # endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    # sig_header = request.headers.get("stripe-signature")
    # try:
    #     event = stripe.Webhook.construct_event(
    #         payload=await request.body(), sig_header=sig_header, secret=endpoint_secret
    #     )
    # except ValueError as e: # Invalid payload
    #     raise HTTPException(status_code=400, detail=str(e))
    # except stripe.error.SignatureVerificationError as e: # Invalid signature
    #     raise HTTPException(status_code=400, detail=str(e))

    event_type = event_payload.type
    data_object = event_payload.data.get("object", {})

    print(f"Received Stripe webhook event: {event_type}")
    # print(f"Data: {data_object}")

    # Handle specific event types
    if event_type == "checkout.session.completed":
        session = data_object
        user_id = session.get("client_reference_id")
        stripe_customer_id = session.get("customer")
        stripe_subscription_id = session.get("subscription")
        # Here, you would update your database: create/update user subscription record
        print(f"Checkout session completed for user {user_id}. Customer: {stripe_customer_id}, Subscription: {stripe_subscription_id}")
        # Mark subscription as active, store stripe IDs, set plan details.
    
    elif event_type == "invoice.payment_succeeded":
        invoice = data_object
        stripe_subscription_id = invoice.get("subscription")
        # Update subscription period, ensure it's active.
        print(f"Invoice payment succeeded for subscription {stripe_subscription_id}.")

    elif event_type == "customer.subscription.updated" or event_type == "customer.subscription.deleted" or event_type == "customer.subscription.trial_will_end":
        subscription_data = data_object
        stripe_subscription_id = subscription_data.get("id")
        new_status = subscription_data.get("status") # e.g., active, canceled, past_due
        # Update subscription status in your database.
        print(f"Subscription {stripe_subscription_id} status updated to {new_status}.")

    # Add more event handlers as needed

    return {"status": "webhook_received_placeholder", "event_type": event_type}

# Ensure this router is added to main.py

