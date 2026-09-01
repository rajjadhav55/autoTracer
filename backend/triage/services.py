from django.db import OperationalError

def execute_chaos_scenario(scenario_name: str):
    """
    Triggers specific failure states to test system resilience.
    """
    if scenario_name == 'deadlock':
        raise OperationalError("deadlock detected: Process 4128 waits for ShareLock on transaction 891; blocked by process 4129.")

    elif scenario_name == 'schema_drift':
        dummy_payload = {"user": {}}
        _ = dummy_payload["user"]["profile"]["preferences"]["theme"]  # Raises KeyError

    elif scenario_name == 'zero_division':
        total_cost = 1000
        order_count = 0
        # pyrefly: ignore [division-by-zero]
        _ = total_cost / order_count  # Raises ZeroDivisionError

    elif scenario_name == 'timeout':
        raise TimeoutError("Connection to payment gateway timed out after 30000ms.")

    else:
        raise ValueError(f"Unhandled chaos scenario triggered: '{scenario_name}'")