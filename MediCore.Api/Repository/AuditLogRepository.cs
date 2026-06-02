using MediCore.Domain.Data;
using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly MediCoreDbContext _context;

    public AuditLogRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(AuditLog log)
    {
        await _context.AuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }
}
