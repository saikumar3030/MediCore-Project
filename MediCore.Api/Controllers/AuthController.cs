using MediCore.Api.DTOs;
using MediCore.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

// Login + refresh-token endpoints. Successful login is recorded by the audit log.
// Other auth flows (register, change password) live in UserController.
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditLogService _auditLogService;

    public AuthController(IAuthService authService, IAuditLogService auditLogService)
    {
        _authService = authService;
        _auditLogService = auditLogService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var (userId, result) = await _authService.LoginAsync(dto);
        await _auditLogService.LogAsync(userId, "Login", "User");
        return Ok(result);
    }

    [HttpPost("refresh-token")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken(LoginResponseDto dto)
    {
        var result = await _authService.RefreshTokenAsync(dto.RefreshToken);
        return Ok(result);
    }
}
