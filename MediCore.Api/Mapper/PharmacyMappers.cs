using MediCore.Api.DTOs;
using MediCore.Api.Utilities;
using MediCore.Domain.Entities;
using MediCore.Domain.Enums;

namespace MediCore.Api.Mapper;

public static class PharmacyMappers
{
    public static Medicine ToEntity(this AddMedicineRequestDto dto) => new()
    {
        MedicineID = IdGenerator.New(),
        Name = dto.Name,
        Type = dto.Type,
        Stock = dto.Stock,
        ExpiryDate = dto.ExpiryDate,
        Status = MedicineStatus.Active,
        CreatedAt = DateTime.UtcNow
    };

    public static MedicineResponseDto ToResponseDto(this Medicine e) => new()
    {
        MedicineID = e.MedicineID,
        Name = e.Name,
        Type = e.Type.ToString(),
        Stock = e.Stock,
        ExpiryDate = e.ExpiryDate,
        Status = e.Status.ToString(),
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    public static IEnumerable<MedicineResponseDto> ToResponseDtoList(this IEnumerable<Medicine> list)
        => list.Select(ToResponseDto).ToList();

    public static DispenseResponseDto ToResponseDto(this Dispense e) => new()
    {
        DispenseID = e.DispenseID,
        MedicineID = e.MedicineID,
        MedicineName = e.Medicine?.Name ?? string.Empty,
        PrescriptionID = e.PrescriptionID,
        PharmacistID = e.PharmacistID,
        Quantity = e.Quantity,
        Status = e.Status.ToString(),
        Date = e.Date
    };

    public static IEnumerable<DispenseResponseDto> ToResponseDtoList(this IEnumerable<Dispense> list)
        => list.Select(ToResponseDto).ToList();
}
