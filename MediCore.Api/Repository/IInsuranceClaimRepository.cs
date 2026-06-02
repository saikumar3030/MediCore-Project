using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IInsuranceClaimRepository
{
    Task<InsuranceClaim?> GetByIdAsync(string claimId);
    Task<InsuranceClaim?> GetActiveclaimByBillIdAsync(string billId);
    Task<IEnumerable<InsuranceClaim>> GetByPatientIdAsync(string patientId);
    Task AddAsync(InsuranceClaim claim);
    Task UpdateAsync(InsuranceClaim claim);
}
