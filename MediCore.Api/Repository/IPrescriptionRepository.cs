using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IPrescriptionRepository
{
    Task<Prescription?> GetByIdAsync(string prescriptionId);
    Task<IEnumerable<Prescription>> GetByEMRIdAsync(string emrId);
    Task<IEnumerable<Prescription>> GetIssuedAsync();
    Task AddAsync(Prescription prescription);
    Task UpdateAsync(Prescription prescription);
}
