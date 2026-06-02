using MediCore.Domain.Data;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MediCore.Api.Repository;

public class InsuranceClaimRepository : IInsuranceClaimRepository
{
    private readonly MediCoreDbContext _context;

    public InsuranceClaimRepository(MediCoreDbContext context)
    {
        _context = context;
    }

    public async Task<InsuranceClaim?> GetByIdAsync(string claimId)
        => await _context.InsuranceClaims
            .Include(c => c.Bill)
            .FirstOrDefaultAsync(c => c.ClaimID == claimId);

    public async Task<InsuranceClaim?> GetActiveclaimByBillIdAsync(string billId)
        => await _context.InsuranceClaims.FirstOrDefaultAsync(c =>
            c.BillID == billId &&
            (c.Status == ClaimStatus.Submitted || c.Status == ClaimStatus.Approved));

    public async Task<IEnumerable<InsuranceClaim>> GetByPatientIdAsync(string patientId)
        => await _context.InsuranceClaims
            .Include(c => c.Bill)
            .Where(c => c.PatientID == patientId)
            .OrderByDescending(c => c.Date)
            .ToListAsync();

    public async Task AddAsync(InsuranceClaim claim)
    {
        await _context.InsuranceClaims.AddAsync(claim);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(InsuranceClaim claim)
    {
        claim.UpdatedAt = DateTime.UtcNow;
        _context.InsuranceClaims.Update(claim);
        await _context.SaveChangesAsync();
    }
}
