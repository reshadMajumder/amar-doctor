def success_response(message="Success", data=None):
    if data is None:
        data = {}
    return {
        "success": True,
        "message": message,
        "data": data
    }

def error_response(message="Error", errors=None):
    if errors is None:
        errors = {}
    return {
        "success": False,
        "message": message,
        "errors": errors
    }
