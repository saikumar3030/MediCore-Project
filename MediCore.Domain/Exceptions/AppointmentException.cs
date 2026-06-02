namespace MediCore.Domain.Exceptions;

public class AppointmentException : MediCoreException
{
    public AppointmentException(string message, int statusCode = 400) : base(message, statusCode) { }
}
