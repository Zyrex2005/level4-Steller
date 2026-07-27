// Lightweight Analytics Integration (PostHog / GA4 Custom Events)

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

class AnalyticsManager {
  private initialized = false;

  public init() {
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
    if (posthogKey) {
      console.log("[Analytics] Initialized PostHog with key:", posthogKey.substring(0, 6) + "...");
      this.initialized = true;
    } else {
      console.log("[Analytics] Running in telemetry log mode (No VITE_POSTHOG_KEY provided)");
    }
  }

  public track(event: string, properties?: Record<string, any>) {
    const payload = { event, properties, timestamp: new Date().toISOString() };
    console.log(`[Analytics Track]`, payload);

    if (this.initialized && typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture(event, properties);
    }
  }

  public trackWalletConnect(address: string) {
    this.track("wallet_connected", { address });
  }

  public trackJobCreated(jobId: number, client: string, freelancer: string, amount: string) {
    this.track("job_created", { jobId, client, freelancer, amount });
  }

  public trackJobFunded(jobId: number, client: string) {
    this.track("job_funded", { jobId, client });
  }

  public trackJobCompleted(jobId: number, freelancer: string) {
    this.track("job_completed", { jobId, freelancer });
  }

  public trackRatingSubmitted(jobId: number, score: number) {
    this.track("rating_submitted", { jobId, score });
  }

  public trackFeedbackSubmitted(rating: number, commentLength: number) {
    this.track("feedback_submitted", { rating, commentLength });
  }
}

export const analytics = new AnalyticsManager();
