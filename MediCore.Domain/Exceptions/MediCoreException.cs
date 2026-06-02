namespace MediCore.Domain.Exceptions;

public class MediCoreException : Exception
{
    public int StatusCode { get; }

    public MediCoreException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}
