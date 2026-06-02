using MediCore.Domain.Entities;

namespace MediCore.Api.Repository;

public interface IEMRRepository
{
    Task<EMR?> GetByIdAsync(string emrId);
    Task<IEnumerable<EMR>> GetByPatientIdAsync(string patientId);
    Task<IEnumerable<EMR>> GetByDoctorIdAsync(string doctorId);
    Task AddAsync(EMR emr);
    Task UpdateAsync(EMR emr);
}
