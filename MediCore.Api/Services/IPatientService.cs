using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IPatientService
{
    Task AddPatientAsync(RequestPatientDto dto);
    Task DeletePatientAsync(string patientId);
    Task<IEnumerable<ResponsePatientDto>> GetAllPatientAsync();
    Task<ResponsePatientDto?> GetByIdAsync(string patientId);
    Task UpdateAsync(UpdatePatientDto dto);
}
