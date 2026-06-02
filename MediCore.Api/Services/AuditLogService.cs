using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _auditRepository;

    public AuditLogService(IAuditLogRepository auditRepository)
    {
        _auditRepository = auditRepository;
    }

    public async Task LogAsync(string userId, string action, string resource)
    {
        try
        {
            var log = new AuditLog
            {
                Id = IdGenerator.New(),
                UserId = userId,
                Action = action,
                Resource = resource,
                TimeStamp = DateTime.UtcNow
            };
            await _auditRepository.LogAsync(log);
        }
        catch (Exception ex)
        {
            throw new IdentityServiceException(ex.Message);
        }
    }
}
