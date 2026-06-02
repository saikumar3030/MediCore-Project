namespace MediCore.Domain.Exceptions;

public class PatientException : MediCoreException
{
    public PatientException(string message, int statusCode = 400) : base(message, statusCode) { }
}
