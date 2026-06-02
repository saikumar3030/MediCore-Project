namespace MediCore.Domain.Exceptions;

public class EmrServiceException : MediCoreException
{
    public EmrServiceException(string message, int statusCode = 400) : base(message, statusCode) { }
}

public class EMRNotFoundException : EmrServiceException
{
    public EMRNotFoundException(string id) : base($"EMR {id} not found.", 404) { }
}

public class PrescriptionNotFoundException : EmrServiceException
{
    public PrescriptionNotFoundException(string id) : base($"Prescription {id} not found.", 404) { }
}

public class UnauthorizedEMRAccessException : EmrServiceException
{
    public UnauthorizedEMRAccessException() : base("You are not authorized to access this record.", 403) { }
}
