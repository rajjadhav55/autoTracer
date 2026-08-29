#!/usr/bin/env python3
"""
Test script for AutoTrace Python SDK (autotrace-py)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Triggers a simulated ZeroDivisionError, sends it to the AutoTrace backend,
and verifies a 201 Created response.
"""

import sys
import os

# Ensure sdk/python is in PYTHONPATH
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SDK_PATH = os.path.join(CURRENT_DIR, "python")
if not os.path.exists(SDK_PATH):
    SDK_PATH = os.path.join(CURRENT_DIR, "sdk", "python")
if SDK_PATH not in sys.path:
    sys.path.insert(0, SDK_PATH)


import autotrace

API_KEY = "autotrace_pk_974e9314c24687b6ffa475192dd870d902a536e0"
ENDPOINT = "http://localhost:8000/api/ingest/"


def main():
    print("==================================================")
    print("       AutoTrace Python SDK Verification Test     ")
    print("==================================================")

    # 1. Initialize AutoTrace client
    print(f"[1] Initializing AutoTrace SDK with key '{API_KEY[:20]}...'")
    client = autotrace.init(
        api_key=API_KEY,
        endpoint_url=ENDPOINT,
        environment="test-suite",
        context={"service": "payment-processor", "version": "1.4.2"},
    )

    # 2. Trigger ZeroDivisionError
    print("[2] Triggering ZeroDivisionError...")
    try:
        total_revenue = 50000
        active_customers = 0
        # pyrefly: ignore [division-by-zero]
        _ = total_revenue / active_customers
    except ZeroDivisionError as exc:
        print(f"    Caught expected exception: {exc.__class__.__name__}: {exc}")

        # 3. Capture exception synchronously to verify HTTP status
        print(f"[3] Dispatching error event to {ENDPOINT}...")
        result = client.capture_exception(
            exc_info=exc,
            endpoint="/api/v1/billing/calculate-arpu",
            context={"attempt": 1, "currency": "USD"},
            sync=True,
        )

        if result:
            status_code, response_data = result
            print(f"[4] Received response: HTTP {status_code}")
            print(f"    Payload: {response_data}")

            if status_code == 201:
                print("\n>>> SUCCESS: Python SDK successfully reported exception (HTTP 201 Created)! <<<")
                return 0
            else:
                print(f"\n>>> FAILURE: Expected HTTP 201, got {status_code} <<<")
                return 1
        else:
            print("\n>>> FAILURE: No response received <<<")
            return 1


if __name__ == "__main__":
    sys.exit(main())
