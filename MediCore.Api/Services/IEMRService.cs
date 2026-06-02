using MediCore.Api.DTOs;

namespace MediCore.Api.Services;

public interface IEMRService
{
    Task<EMRResponseDto> CreateAsync(CreateEMRRequestDto dto);
    Task<EMRResponseDto> GetByIdAsync(string emrId);
    Task<IEnumerable<EMRResponseDto>> GetByPatientIdAsync(string patientId);
    Task<EMRResponseDto> UpdateAsync(string emrId, UpdateEMRRequestDto dto);
    Task<PrescriptionResponseDto> AddPrescriptionAsync(string emrId, AddPrescriptionRequestDto dto);
    Task<IEnumerable<PrescriptionResponseDto>> GetPrescriptionsAsync(string emrId);
}
