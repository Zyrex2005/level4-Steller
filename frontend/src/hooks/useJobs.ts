import { useEffect, useState, useCallback, useRef } from "react";
import type { JobItem } from "../components/JobList";
import { getJobDetails, ESCROW_CONTRACT_ID, rpcServer } from "../lib/soroban";

export function useJobs() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastLedgerRef = useRef<number>(0);

  // Sequentially load all jobs starting from ID 0 until getJobDetails throws (Not Found)
  const refreshJobs = useCallback(async () => {
    if (!ESCROW_CONTRACT_ID) {
      setLoading(false);
      return;
    }
    
    try {
      const jobList: JobItem[] = [];
      let id = 0;
      
      // Fetch sequential IDs
      while (true) {
        try {
          const jobData = await getJobDetails(id);
          jobList.push({ id, ...jobData });
          id++;
        } catch (err) {
          // Normal termination: hit the end of existing job IDs
          break;
        }
      }
      
      // Sort jobs by ID descending (newest first)
      jobList.sort((a, b) => b.id - a.id);
      setJobs(jobList);
      setError(null);
    } catch (err) {
      console.error("Failed to load jobs from ledger:", err);
      setError("Failed to fetch jobs from the blockchain.");
    } finally {
      setLoading(false);
    }
  }, []);

  // First fetch on load
  useEffect(() => {
    refreshJobs();
    
    // Set initial ledger sequence value to start listening from
    rpcServer.getLatestLedger()
      .then((res) => {
        lastLedgerRef.current = res.sequence;
      })
      .catch((err) => {
        console.error("Failed to fetch latest ledger:", err);
      });
  }, [refreshJobs]);

  // Event Polling Listener (runs every 5 seconds)
  useEffect(() => {
    if (!ESCROW_CONTRACT_ID) return;

    const interval = setInterval(async () => {
      try {
        if (lastLedgerRef.current === 0) return;
        
        // Query events from the last ledger checked
        const response = await rpcServer.getEvents({
          startLedger: lastLedgerRef.current,
          filters: [
            {
              type: "contract",
              contractIds: [ESCROW_CONTRACT_ID],
            },
          ],
          limit: 20,
        });

        if (response.events && response.events.length > 0) {
          console.log("[Event Listener] New events received:", response.events);
          
          // Update the last checked ledger sequence to the max sequence found in events
          let maxLedger = lastLedgerRef.current;
          for (const ev of response.events) {
            if (ev.ledger > maxLedger) {
              maxLedger = ev.ledger;
            }
          }
          lastLedgerRef.current = maxLedger + 1;

          // Trigger job reload
          console.log("[Event Listener] Refreshing jobs state...");
          await refreshJobs();
        }
      } catch (err) {
        console.warn("[Event Listener] Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshJobs]);

  return { jobs, loading, error, refreshJobs };
}
