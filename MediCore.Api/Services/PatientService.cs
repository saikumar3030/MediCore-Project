using MediCore.Api.DTOs;
using MediCore.Api.Mapper;
using MediCore.Api.Repository;
using MediCore.Api.Utilities;
using MediCore.Domain.Exceptions;

namespace MediCore.Api.Services;

public class PatientService : IPatientService
{
    private readonly IPatientRepository _patientRepository;
    private readonly IUserService _userService;        // direct in-process call (replaces IdentityServiceClient)

    public PatientService(IPatientRepository patientRepository, IUserService userService)
    {
        _patientRepository = patientRepository;
        _userService = userService;
    }

    public async Task AddPatientAsync(RequestPatientDto dto)
    {
        var patientExist = await _patientRepository.GetByIdAsync(dto.PatientID);
        if (patientExist != null)
            throw new PatientException(ErrorMessages.PatientAlreadyExists, 409);

        await _patientRepository.AddAsync(dto.ToEntity());
    }

    public Task DeletePatientAsync(string patientId)
        => _patientRepository.DeleteAsync(patientId);

    public async Task<IEnumerable<ResponsePatientDto>> GetAllPatientAsync()
    {
        var patients = await _patientRepository.GetAllAsync();
        var result = patients.Select(p => p.ToResponseDto()).ToList();

        foreach (var dto in result)
        {
            try
            {
                var user = await _userService.GetByIdAsync(dto.PatientID);
                if (user != null)
                {
                    dto.Name = user.UserName;
                    dto.Email = user.Email;
                }
            }
            catch (IdentityServiceException)
            {
                // user no longer exists — leave name/email empty
            }
        }

        return result;
    }

    public async Task<ResponsePatientDto?> GetByIdAsync(string patientId)
    {
        var patient = await _patientRepository.GetByIdAsync(patientId)
            ?? throw new PatientException(ErrorMessages.PatientNotFound, 404);

        var result = patient.ToResponseDto();
        try
        {
            var user = await _userService.GetByIdAsync(patientId);
            if (user != null)
            {
                result.Name = user.UserName;
                result.Email = user.Email;
            }
        }
        catch (IdentityServiceException)
        {
            // ignore — patient row exists but user record was removed
        }

        return result;
    }

    public async Task UpdateAsync(UpdatePatientDto dto)
    {
        // Use the unfiltered fetch so admins can edit (and reactivate) a
        // soft-deleted patient. Reactivation itself is driven by the User
        // status update; we mirror it back onto Patient.Status so the row
        // reappears in active listings without requiring a second click.
        var existing = await _patientRepository.GetByIdIncludingInactiveAsync(dto.PatientID)
            ?? throw new PatientException(ErrorMessages.PatientNotFound, 404);

        dto.ApplyUpdate(existing);

        try
        {
            var user = await _userService.GetByIdAsync(dto.PatientID);
            if (user != null)
            {
                existing.Status = string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase);
            }
        }
        catch (IdentityServiceException)
        {
            // user record missing — keep current Patient.Status as-is
        }

        await _patientRepository.UpdateAsync(existing);
    }
}
