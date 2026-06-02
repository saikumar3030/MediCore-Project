using System.Security.Claims;
using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class EMRService : IEMRService
{
    private readonly IEMRRepository _emrRepository;
    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IUserService _userService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public EMRService(
        IEMRRepository emrRepository,
        IPrescriptionRepository prescriptionRepository,
        IUserService userService,
        IHttpContextAccessor httpContextAccessor)
    {
        _emrRepository = emrRepository;
        _prescriptionRepository = prescriptionRepository;
        _userService = userService;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetUserIdFromToken()
        => _httpContextAccessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<UserResponseDto?> SafeGetUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;
        try { return await _userService.GetByIdAsync(userId); }
        catch (IdentityServiceException) { return null; }
    }

    private async Task<EMRResponseDto> ToResponseAsync(EMR emr)
    {
        var dto = emr.ToResponseDto();
        dto.Patient = await SafeGetUserAsync(emr.PatientID);
        dto.Doctor = await SafeGetUserAsync(emr.DoctorID);
        return dto;
    }

    public async Task<EMRResponseDto> CreateAsync(CreateEMRRequestDto dto)
    {
        var emr = dto.ToEntity();
        emr.DoctorID = GetUserIdFromToken();
        await _emrRepository.AddAsync(emr);
        return await ToResponseAsync(emr);
    }

    public async Task<EMRResponseDto> GetByIdAsync(string emrId)
    {
        var emr = await _emrRepository.GetByIdAsync(emrId) ?? throw new EMRNotFoundException(emrId);
        return await ToResponseAsync(emr);
    }

    public async Task<IEnumerable<EMRResponseDto>> GetByPatientIdAsync(string patientId)
    {
        var emrs = await _emrRepository.GetByPatientIdAsync(patientId);
        var cache = new Dictionary<string, UserResponseDto?>();
        var results = new List<EMRResponseDto>();
        foreach (var emr in emrs)
        {
            var dto = emr.ToResponseDto();
            dto.Patient = await GetCached(cache, emr.PatientID);
            dto.Doctor = await GetCached(cache, emr.DoctorID);
            results.Add(dto);
        }
        return results;
    }

    private async Task<UserResponseDto?> GetCached(Dictionary<string, UserResponseDto?> cache, string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;
        if (cache.TryGetValue(userId, out var cached)) return cached;
        var user = await SafeGetUserAsync(userId);
        cache[userId] = user;
        return user;
    }

    public async Task<EMRResponseDto> UpdateAsync(string emrId, UpdateEMRRequestDto dto)
    {
        var emr = await _emrRepository.GetByIdAsync(emrId) ?? throw new EMRNotFoundException(emrId);
        if (emr.DoctorID != GetUserIdFromToken())
            throw new UnauthorizedEMRAccessException();

        emr.Diagnosis = dto.Diagnosis;
        emr.TreatmentPlan = dto.TreatmentPlan;
        emr.Status = dto.Status;
        await _emrRepository.UpdateAsync(emr);
        return await ToResponseAsync(emr);
    }

    public async Task<PrescriptionResponseDto> AddPrescriptionAsync(string emrId, AddPrescriptionRequestDto dto)
    {
        var emr = await _emrRepository.GetByIdAsync(emrId) ?? throw new EMRNotFoundException(emrId);
        if (emr.Status == EMRStatus.Closed || emr.Status == EMRStatus.Archived)
            throw new EmrServiceException(ErrorMessages.CannotAddPrescriptionToClosedOrArchivedEmr);

        var prescription = dto.ToEntity();
        prescription.EMRID = emrId;
        prescription.DoctorID = GetUserIdFromToken();
        await _prescriptionRepository.AddAsync(prescription);
        return prescription.ToResponseDto();
    }

    public async Task<IEnumerable<PrescriptionResponseDto>> GetPrescriptionsAsync(string emrId)
    {
        _ = await _emrRepository.GetByIdAsync(emrId) ?? throw new EMRNotFoundException(emrId);
        return (await _prescriptionRepository.GetByEMRIdAsync(emrId)).ToResponseDtoList();
    }
}
