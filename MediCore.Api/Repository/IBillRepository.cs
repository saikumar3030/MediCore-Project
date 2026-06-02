using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IBillRepository
{
    Task<Bill?> GetByIdAsync(string billId);
    Task<IEnumerable<Bill>> GetAllAsync();
    Task<IEnumerable<Bill>> GetByPatientIdAsync(string patientId);
    Task AddAsync(Bill bill);
    Task UpdateAsync(Bill bill);
}
