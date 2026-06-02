using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface ILabTestRepository
{
    Task<LabTest?> GetByIdAsync(string testId);
    Task<IEnumerable<LabTest>> GetAllAsync();
    Task<IEnumerable<LabTest>> GetByPatientIdAsync(string patientId);
    Task<IEnumerable<LabTest>> GetByLabTechnicianIdAsync(string technicianId);
    Task AddAsync(LabTest labTest);
    Task UpdateAsync(LabTest labTest);
}
