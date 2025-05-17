import axios, { AxiosRequestConfig } from "axios";

// Simple in-memory rate limiter
interface RateLimit {
  count: number;
  lastReset: number;
  windowMs: number; // Rate limit window in milliseconds
}

const rateLimit: RateLimit = {
  count: 0,
  lastReset: Date.now(),
  windowMs: 60 * 1000, // 1 minute window
};

const MAX_REQUESTS_PER_MINUTE = 50; // Adjust based on API limits
const MAX_DELAY = 8000; // Cap backoff delay at 8 seconds

// Add jitter to prevent synchronized retries
const addJitter = (delay: number): number => {
  const jitter = Math.random() * 100;
  return delay + jitter;
};

// Centralized API request function with backoff and rate limiting
export const apiRequest = async <T>(
  config: AxiosRequestConfig,
  retries = 3,
  delay = 1000
): Promise<T> => {
  // Reset rate limit count if window has passed
  const now = Date.now();
  if (now - rateLimit.lastReset > rateLimit.windowMs) {
    rateLimit.count = 0;
    rateLimit.lastReset = now;
  }

  // Check rate limit
  if (rateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    const timeUntilReset = rateLimit.lastReset + rateLimit.windowMs - now;
    await new Promise((resolve) => setTimeout(resolve, timeUntilReset));
    rateLimit.count = 0;
    rateLimit.lastReset = Date.now();
  }

  rateLimit.count++;

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429 && retries > 0) {
      const nextDelay = Math.min(addJitter(delay * 2), MAX_DELAY);
      await new Promise((resolve) => setTimeout(resolve, nextDelay));
      return apiRequest<T>(config, retries - 1, nextDelay);
    }
    throw error;
  }
};

// Custom hook for throttled API calls
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useApi = () => {
  const queryClient = new QueryClient();

  const get = <T>(url: string, queryKey: string[]) =>
    useQuery({
      queryKey,
      queryFn: () => apiRequest<T>({ method: "get", url }),
      retry: 0, // Backoff handled by apiRequest
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      onError: (error) => {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            toast.error("Rate limit exceeded. Please wait and try again.");
          } else {
            toast.error(error.response?.data?.error || `Failed to fetch ${queryKey[0]}`);
          }
        } else {
          toast.error(`Failed to fetch ${queryKey[0]}`);
        }
      },
    });

  const mutate = <T, V>(
    url: string,
    method: "post" | "put" | "delete",
    onSuccessMessage: string
  ) =>
    useMutation({
      mutationFn: (data: V) => apiRequest<T>({ method, url, data }),
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success(onSuccessMessage);
      },
      onError: (error) => {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            toast.error("Rate limit exceeded. Please wait and try again.");
          } else {
            toast.error(error.response?.data?.error || `Failed to ${method} data`);
          }
        } else {
          toast.error(`Failed to ${method} data`);
        }
      },
    });

  return { get, mutate };
};