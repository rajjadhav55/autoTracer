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

    elif scenario_name in ('sports_turf', 'sports', 'turf_pricing'):
        hourly_rate = 1500
        slot_hours = None  # NoneType
        # Intentionally triggers TypeError: unsupported operand type(s) for *: 'int' and 'NoneType'
        _ = hourly_rate * slot_hours

    else:
        raise ValueError(f"Unhandled chaos scenario triggered: '{scenario_name}'")