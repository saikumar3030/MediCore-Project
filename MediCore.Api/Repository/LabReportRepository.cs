using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class LabReportRepository : ILabReportRepository
{
    private readonly MediCoreDbContext _context;

    public LabReportRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<LabReport?> GetByTestIdAsync(string testId)
        => await _context.LabReports.FirstOrDefaultAsync(r => r.TestID == testId);

    public async Task AddAsync(LabReport report)
    {
        await _context.LabReports.AddAsync(report);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(LabReport report)
    {
        report.UpdatedAt = DateTime.UtcNow;
        _context.LabReports.Update(report);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(LabReport report)
    {
        _context.LabReports.Remove(report);
        await _context.SaveChangesAsync();
    }
}
