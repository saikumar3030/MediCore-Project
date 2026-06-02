using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class PatientMappers
{
    public static Patient ToEntity(this RequestPatientDto dto) => new()
    {
        PatientID = dto.PatientID,
        DOB = dto.DOB,
        Gender = (GenderOption)dto.Gender,
        Address = dto.Address,
        Phone = dto.Phone ?? string.Empty,
        InsuranceID = dto.InsuranceID,
        Status = true
    };

    public static ResponsePatientDto ToResponseDto(this Patient e) => new()
    {
        PatientID = e.PatientID,
        DOB = e.DOB,
        Gender = (int)e.Gender,
        Address = e.Address,
        Phone = e.Phone,
        InsuranceID = e.InsuranceID,
        Status = e.Status
    };

    public static IEnumerable<ResponsePatientDto> ToResponseDtoList(this IEnumerable<Patient> patients)
        => patients.Select(ToResponseDto).ToList();

    // Update mutates an existing entity; PatientID is the key and is never overwritten.
    public static void ApplyUpdate(this UpdatePatientDto dto, Patient existing)
    {
        existing.DOB = dto.DOB;
        existing.Gender = (GenderOption)dto.Gender;
        existing.Address = dto.Address;
        existing.Phone = dto.Phone ?? string.Empty;
        existing.InsuranceID = dto.InsuranceID;
    }

    public static ResponsePatientDocumentDto ToResponseDto(this PatientDocument e) => new()
    {
        DocumentID = e.DocumentID,
        PatientID = e.PatientID,
        DocType = (int)e.DocType,
        FileURI = e.FileURI,
        FileName = e.FileName,
        UploadedDate = e.UploadedDate
    };

    public static IEnumerable<ResponsePatientDocumentDto> ToResponseDtoList(this IEnumerable<PatientDocument> docs)
        => docs.Select(ToResponseDto).ToList();
}
