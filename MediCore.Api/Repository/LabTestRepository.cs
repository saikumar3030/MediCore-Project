using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class LabTestRepository : ILabTestRepository
{
    private readonly MediCoreDbContext _context;

    public LabTestRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<LabTest?> GetByIdAsync(string testId)
        => await _context.LabTests
            .Include(t => t.Report)
            .FirstOrDefaultAsync(t => t.TestID == testId);

    public async Task<IEnumerable<LabTest>> GetAllAsync()
        => await _context.LabTests
            .Include(t => t.Report)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

    public async Task<IEnumerable<LabTest>> GetByPatientIdAsync(string patientId)
        => await _context.LabTests
            .Include(t => t.Report)
            .Where(t => t.PatientID == patientId)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

    public async Task<IEnumerable<LabTest>> GetByLabTechnicianIdAsync(string technicianId)
        => await _context.LabTests
            .Include(t => t.Report)
            .Where(t => t.TechnicianID == technicianId)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

    public async Task AddAsync(LabTest labTest)
    {
        await _context.LabTests.AddAsync(labTest);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(LabTest labTest)
    {
        labTest.UpdatedAt = DateTime.UtcNow;
        _context.LabTests.Update(labTest);
        await _context.SaveChangesAsync();
    }
}
