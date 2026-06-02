using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IDispenseRepository
{
    Task<Dispense?> GetByIdAsync(string dispenseId);
    Task<IEnumerable<Dispense>> GetAllAsync();
    Task<Dispense?> GetByPrescriptionIdAsync(string prescriptionId);
    Task<bool> HasDispensesForMedicineAsync(string medicineId);
    Task AddAsync(Dispense dispense);
    Task UpdateAsync(Dispense dispense);
}
