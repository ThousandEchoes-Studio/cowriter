// frontend/src/screens/SubscriptionScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { BillingService, Subscription } from '../services/ApiService';
import { AuthContext } from '../contexts/AuthContext'; // To get user info if needed

// Placeholder for Stripe.js or a similar library if doing actual client-side Stripe integration
// For this prototype, we'll simulate the flow.

const SubscriptionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!user) {
        Alert.alert("Error", "You must be logged in to view subscription status.");
        setIsLoading(false);
        navigation.navigate("Login");
        return;
      }
      try {
        setIsLoading(true);
        const status = await BillingService.getSubscriptionStatus();
        setSubscription(status);
      } catch (error: any) {
        console.error("Failed to fetch subscription status:", error);
        Alert.alert("Error", error.message || "Failed to load subscription details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user, navigation]);

  const handleUpgradeToPremium = async (planId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to upgrade.");
      return;
    }
    setIsProcessingCheckout(true);
    try {
      // In a real app, you'd get a session ID and redirect to Stripe Checkout
      // or use Stripe Elements for an in-app payment form.
      const checkoutData = await BillingService.createCheckoutSession(planId);
      console.log("Checkout Session Data (Placeholder):", checkoutData);
      Alert.alert(
        "Upgrade to Premium (Simulated)",
        `A checkout session (ID: ${checkoutData.sessionId}) would be initiated here. This is a placeholder for Stripe integration. Publishable Key: ${checkoutData.publishableKey}`
      );
      // Simulate successful upgrade for prototype by refetching status (or updating locally)
      // In a real scenario, a webhook would update the backend, and then client would refetch.
      // For now, let's assume it was successful and show a message.
      // To see a change, you'd manually update the backend placeholder or implement webhook handling.
      setSubscription(prev => prev ? { ...prev, plan_id: planId, status: 'active' } : null);

    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      Alert.alert("Upgrade Error", error.message || "Could not initiate the upgrade process.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription Status</Text>
      {subscription ? (
        <View style={styles.statusContainer}>
          <Text style={styles.text}>Plan: {subscription.plan_id}</Text>
          <Text style={styles.text}>Status: {subscription.status}</Text>
          {subscription.plan_id === 'free' && (
            <Button 
              title="Upgrade to Premium Monthly"
              onPress={() => handleUpgradeToPremium('premium_monthly')} 
              disabled={isProcessingCheckout}
            />
          )}
          {/* Add more plan details or management options here */}
        </View>
      ) : (
        <Text style={styles.text}>Could not load subscription details.</Text>
      )}
      {isProcessingCheckout && <ActivityIndicator style={{ marginTop: 20 }} />}
      <Button title="Back to Home" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
    color: '#555',
  },
});

export default SubscriptionScreen;

