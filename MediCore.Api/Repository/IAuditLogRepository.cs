using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IAuditLogRepository
{
    Task LogAsync(AuditLog log);
}
