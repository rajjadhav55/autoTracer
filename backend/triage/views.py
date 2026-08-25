# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
from .services import execute_chaos_scenario

class ChaosTriggerView(APIView):
    """
    Endpoint to simulate production failures for testing AutoTrace triage.
    Usage: POST /api/chaos/trigger/?scenario=<type>
    """
    def post(self, request):
        # 1. Get the HTTP parameter
        scenario = request.query_params.get('scenario', 'null_pointer')

        # 2. Pass the data to the service layer to do the actual work
        execute_chaos_scenario(scenario)

        # 3. Return HTTP response (though the service will crash the app before this runs!)
        return Response({"status": "Success", "message": f"Scenario {scenario} triggered."})