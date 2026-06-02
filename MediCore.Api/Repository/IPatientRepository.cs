using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IPatientRepository
{
    Task AddAsync(Patient patient);
    Task<Patient?> GetByIdAsync(string patientId);
    /// <summary>Returns the patient even when soft-deleted (Status = false). Used by admin update flows that need to reactivate.</summary>
    Task<Patient?> GetByIdIncludingInactiveAsync(string patientId);
    Task<IEnumerable<Patient>> GetAllAsync();
    Task UpdateAsync(Patient patient);
    Task DeleteAsync(string patientId);
}
