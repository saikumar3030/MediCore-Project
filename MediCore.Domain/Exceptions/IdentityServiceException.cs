namespace MediCore.Domain.Exceptions;

public class IdentityServiceException : MediCoreException
{
    public IdentityServiceException(string message, int statusCode = 400) : base(message, statusCode) { }
}
