using MediCore.Api.DTOs;
using MediCore.Api.Services;
using MediCore.Api.Utilities;
using MediCore.Domain.Enums;
using MediCore.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// User registration, fetch, update, delete + doctor/lab-tech directory lookups.
// Patient registration is bundled into Register (creates a User AND a Patient row).
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuditLogService _auditService;
    private readonly IPatientService _patientService;     // direct DI replaces HTTP client

    public UserController(
        IUserService userService,
        IAuditLogService auditService,
        IPatientService patientService)
    {
        _userService = userService;
        _auditService = auditService;
        _patientService = patientService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<UserResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Register(RegisterRequestDto dto)
    {
        var isAdmin = User.IsInRole(nameof(RoleOption.Admin));

        if (!isAdmin && dto.Role != nameof(RoleOption.Patient))
            return StatusCode(StatusCodes.Status403Forbidden, ErrorMessages.OnlyPatientSelfRegister);

        if (isAdmin && dto.Role == nameof(RoleOption.Admin))
            return BadRequest(ErrorMessages.AdminCannotBeRegistered);

        var result = await _userService.RegisterUserAsync(dto);
        await _auditService.LogAsync(result.UserId, "CREATE", "User");

        if (dto.Role == nameof(RoleOption.Patient))
        {
            if (dto.patientRequestDtos == null)
                return BadRequest(ErrorMessages.PatientProfileDataRequiredOnRegister);

            try
            {
                await _patientService.AddPatientAsync(new RequestPatientDto
                {
                    PatientID = result.UserId,
                    DOB = dto.patientRequestDtos.DOB,
                    Gender = dto.patientRequestDtos.Gender,
                    Address = dto.patientRequestDtos.Address,
                    Phone = dto.patientRequestDtos.Phone ?? string.Empty,
                    InsuranceID = dto.patientRequestDtos.InsuranceID
                });
            }
            catch
            {
                // rollback the user to avoid orphaned accounts
                await _userService.DeleteUserAsync(result.UserId);
                throw;
            }
        }

        return Ok(Messages.UserCreated);
    }

    [Authorize(Roles = nameof(RoleOption.Admin))]
    [HttpGet("getall")]
    [ProducesResponseType(typeof(IEnumerable<UserResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
        => Ok(await _userService.GetAllUserAsync());

    [HttpGet("{userId}")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOne(string userId)
        => Ok(await _userService.GetByIdAsync(userId));

    [HttpPut("{userId}")]
    public async Task<IActionResult> Update([FromRoute] string userId, [FromBody] UserUpdateDto dto)
    {
        var existingUser = await _userService.GetByIdAsync(userId)
            ?? throw new IdentityServiceException(ErrorMessages.UserNotFound, 404);

        var previousRole = existingUser.Role;
        var newRole = dto.Role;

        // Role-change rules:
        //   - only Admins may change anyone's role
        //   - the Admin role itself cannot be granted OR revoked (locked tier)
        var roleChanging = !string.IsNullOrWhiteSpace(newRole) &&
                           !string.Equals(newRole, previousRole, StringComparison.OrdinalIgnoreCase);
        if (roleChanging)
        {
            if (!User.IsInRole(nameof(RoleOption.Admin)))
                return StatusCode(StatusCodes.Status403Forbidden, ErrorMessages.RoleChangeRequiresAdmin);

            if (string.Equals(newRole, nameof(RoleOption.Admin), StringComparison.OrdinalIgnoreCase))
                return BadRequest(ErrorMessages.CannotAssignAdminRole);

            if (string.Equals(previousRole, nameof(RoleOption.Admin), StringComparison.OrdinalIgnoreCase))
                return BadRequest(ErrorMessages.CannotChangeAdminRole);
        }

        // Save User first so PatientService sees the latest Status when it
        // mirrors it onto Patient (otherwise reactivation needs two saves).
        await _userService.UpdateUserAsync(userId, dto);

        if (newRole == nameof(RoleOption.Patient))
        {
            if (dto.patientRequestDtos == null)
                return BadRequest(ErrorMessages.PatientProfileDataRequiredForRole);

            var patientDto = new RequestPatientDto
            {
                PatientID = userId,
                DOB = dto.patientRequestDtos.DOB,
                Gender = dto.patientRequestDtos.Gender,
                Address = dto.patientRequestDtos.Address,
                Phone = dto.patientRequestDtos.Phone ?? string.Empty,
                InsuranceID = dto.patientRequestDtos.InsuranceID
            };

            if (previousRole == nameof(RoleOption.Patient))
            {
                await _patientService.UpdateAsync(new UpdatePatientDto
                {
                    PatientID = userId,
                    DOB = patientDto.DOB,
                    Gender = patientDto.Gender,
                    Address = patientDto.Address,
                    Phone = patientDto.Phone,
                    InsuranceID = patientDto.InsuranceID
                });
            }
            else
            {
                await _patientService.AddPatientAsync(patientDto);
            }
        }

        return Ok("User updated successfully.");
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete([FromRoute] string userId)
    {
        await _userService.DeleteUserAsync(userId);
        return Ok("User deleted successfully.");
    }

    [HttpGet("GetAllDoctor")]
    public async Task<IActionResult> GetAllDoctor()
        => Ok(await _userService.GetAllDoctors());

    [HttpGet("GetAllLabTechnicians")]
    [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Doctor)}")]
    public async Task<IActionResult> GetAllLabTechnicians()
        => Ok(await _userService.GetAllLabTechnicians());
}
