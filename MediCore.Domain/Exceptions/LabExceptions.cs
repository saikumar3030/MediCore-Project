namespace MediCore.Domain.Exceptions;

public class LabServiceException : MediCoreException
{
    public LabServiceException(string message, int statusCode = 400) : base(message, statusCode) { }
}

public class LabTestNotFoundException : LabServiceException
{
    public LabTestNotFoundException(string id) : base($"Lab test {id} not found.", 404) { }
}

public class LabReportNotFoundException : LabServiceException
{
    public LabReportNotFoundException(string testId) : base($"Report for test {testId} not found.", 404) { }
}

public class LabReportAlreadyExistsException : LabServiceException
{
    public LabReportAlreadyExistsException(string testId)
        : base($"Report for test {testId} already exists.", 409) { }
}

public class UnauthorizedLabAccessException : LabServiceException
{
    public UnauthorizedLabAccessException() : base("You are not authorized to access this record.", 403) { }
}
