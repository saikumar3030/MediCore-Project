namespace MediCore.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(string userId, string action, string resource);
}
