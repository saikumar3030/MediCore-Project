// using System.Security.Claims;
// using MediCore.Api.Services;
// using MediCore.Domain.Enums;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace MediCore.Api.Controllers;

// // Upload, list, and download patient documents (ID proofs, insurance cards,
// // Aadhaar, passport scans, etc.). The upload endpoint is multipart/form-data;
// // files are persisted to wwwroot/uploads/patient-documents/{patientId}/.
// [Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Doctor)}")]
// [ApiController]
// [Route("api/[controller]")]
// public class PatientDocumentController : ControllerBase
// {
//     private readonly IPatientDocumentService _patientDocumentService;

//     // Cap a single upload at 10 MB to match the server-side limit and avoid
//     // a hard buffering allocation for very large files.
//     private const long MaxUploadBytes = 10 * 1024 * 1024;

//     public PatientDocumentController(IPatientDocumentService patientDocumentService)
//     {
//         _patientDocumentService = patientDocumentService;
//     }

//     private string GetPatientIdFromToken()
//         => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

//     // POST /api/PatientDocument
//     // Form fields: file (IFormFile), docType (int)
//     [HttpPost]
//     [Consumes("multipart/form-data")]
//     [RequestSizeLimit(MaxUploadBytes)]
//     [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
//     public async Task<IActionResult> UploadDocument(
//         [FromForm] IFormFile file,
//         [FromForm] int docType)
//     {
//         var patientId = GetPatientIdFromToken();
//         var created = await _patientDocumentService.UploadDocumentAsync(patientId, docType, file);
//         return StatusCode(201, new
//         {
//             success = true,
//             message = "Patient Document uploaded successfully",
//             data = created
//         });
//     }

//     [Authorize(Roles = nameof(RoleOption.Admin))]
//     [HttpGet]
//     public async Task<IActionResult> GetAll()
//     {
//         var documents = await _patientDocumentService.GetAllDocumentAsync();
//         return Ok(new { success = true, message = "Successfully Document data fetched.", data = documents });
//     }

//     [HttpGet("{documentId}")]
//     public async Task<IActionResult> GetOne(string documentId)
//     {
//         var document = await _patientDocumentService.GetDocumentByIdAsync(documentId);
//         return Ok(new { success = true, message = "Successfully Document data fetched.", data = document });
//     }

//     [HttpDelete("{documentId}")]
//     public async Task<IActionResult> Delete(string documentId)
//     {
//         await _patientDocumentService.DeleteDocumentAsync(documentId);
//         return StatusCode(202, new { success = true, message = "Successfully document deleted." });
//     }

//     [HttpGet("GetDocumentByPatientId/{patientId}")]
//     public async Task<IActionResult> GetDocumentForPatient(string patientId)
//     {
//         var docs = await _patientDocumentService.GetDocumentsByPatientIdAsync(patientId);
//         return Ok(new { success = true, message = "Successfully retrieved", data = docs });
//     }
// }




using System.Security.Claims;
using MediCore.Api.Services;
using MediCore.Api.DTOs; 
using MediCore.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCore.Api.Controllers;

[Authorize(Roles = $"{nameof(RoleOption.Admin)},{nameof(RoleOption.Patient)},{nameof(RoleOption.Doctor)}")]
[ApiController]
[Route("api/[controller]")]
public class PatientDocumentController : ControllerBase
{
    private readonly IPatientDocumentService _patientDocumentService;

    private const long MaxUploadBytes = 10 * 1024 * 1024;

    public PatientDocumentController(IPatientDocumentService patientDocumentService)
    {
        _patientDocumentService = patientDocumentService;
    }

    private string GetPatientIdFromToken()
    {
        var patientId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(patientId))
            throw new UnauthorizedAccessException("Invalid token: Patient ID not found");

        return patientId;
    }

   
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxUploadBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxUploadBytes)]
    public async Task<IActionResult> UploadDocument([FromForm] UploadPatientDocumentRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { success = false, message = "File is required" });
        }

        if (request.File.Length > MaxUploadBytes)
        {
            return BadRequest(new { success = false, message = "File exceeds 10MB limit" });
        }

        var patientId = GetPatientIdFromToken();

        try
        {
            var created = await _patientDocumentService
                .UploadDocumentAsync(patientId, request.DocType, request.File);

            return StatusCode(201, new
            {
                success = true,
                message = "Patient Document uploaded successfully",
                data = created
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                message = ex.Message
            });
        }
    }

   
    [Authorize(Roles = nameof(RoleOption.Admin))]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var documents = await _patientDocumentService.GetAllDocumentAsync();

            return Ok(new
            {
                success = true,
                message = "Successfully document data fetched.",
                data = documents
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

   
    [HttpGet("{documentId}")]
    public async Task<IActionResult> GetOne(string documentId)
    {
        if (string.IsNullOrEmpty(documentId))
        {
            return BadRequest(new { success = false, message = "Document ID is required" });
        }

        try
        {
            var document = await _patientDocumentService.GetDocumentByIdAsync(documentId);

            return Ok(new
            {
                success = true,
                message = "Successfully document fetched.",
                data = document
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    
    [HttpDelete("{documentId}")]
    public async Task<IActionResult> Delete(string documentId)
    {
        if (string.IsNullOrEmpty(documentId))
        {
            return BadRequest(new { success = false, message = "Document ID is required" });
        }

        try
        {
            await _patientDocumentService.DeleteDocumentAsync(documentId);

            return StatusCode(202, new
            {
                success = true,
                message = "Successfully document deleted."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }


    [HttpGet("GetDocumentByPatientId/{patientId}")]
    public async Task<IActionResult> GetDocumentForPatient(string patientId)
    {
        if (string.IsNullOrEmpty(patientId))
        {
            return BadRequest(new { success = false, message = "Patient ID is required" });
        }

        try
        {
            var docs = await _patientDocumentService
                .GetDocumentsByPatientIdAsync(patientId);

            return Ok(new
            {
                success = true,
                message = "Successfully retrieved",
                data = docs
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}