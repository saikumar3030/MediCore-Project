import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import axios from 'axios';
import { HttpClient } from '@angular/common/http';

import { User, RegisterRequest, UpdateUserRequest } from '../models/user.model';
import { environment } from '../../../environments/environment';

// JWT is attached globally by registerAxiosAuthInterceptor for axios,
// and by authInterceptor (HttpInterceptorFn) for HttpClient.
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiGatewayUrl}/api/User`;
  private http = inject(HttpClient);

  register(request: RegisterRequest): Observable<User> {
    return from(axios.post<User>(`${this.apiUrl}/register`, request))
      .pipe(map(r => r.data));
  }

  getAll(): Observable<User[]> {
    return from(axios.get(`${this.apiUrl}/getall`)).pipe(
      map(r => this.normalizeUserList(r.data))
    );
  }

  getAllDoctors(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/GetAllDoctor`).pipe(
      map(responseData => this.normalizeUserList(responseData))
    );
  }

  getAllLabTechnicians(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/GetAllLabTechnicians`).pipe(
      map(responseData => this.normalizeUserList(responseData))
    );
  }

  getById(userId: string): Observable<User> {
    return from(axios.get<User>(`${this.apiUrl}/${userId}`))
      .pipe(map(r => r.data));
  }

  update(userId: string, request: UpdateUserRequest): Observable<User> {
    return from(axios.put<User>(`${this.apiUrl}/${userId}`, request))
      .pipe(map(r => r.data));
  }

  delete(userId: string): Observable<void> {
    return from(axios.delete(`${this.apiUrl}/${userId}`))
      .pipe(map(() => undefined));
  }

  // Backend may wrap the list in $values / value / data, or send it raw;
  // property names also vary between PascalCase and camelCase.
  private normalizeUserList(responseData: any): User[] {
    let rawList: any[];
    if (Array.isArray(responseData))            rawList = responseData;
    else if (responseData?.$values)             rawList = responseData.$values;
    else if (responseData?.value)               rawList = responseData.value;
    else if (responseData?.data)                rawList = responseData.data;
    else                                        rawList = [];

    return rawList.map(item => ({
      userId:   item.userId   ?? item.UserID   ?? item.UserId   ?? '',
      userName: item.userName ?? item.UserName ?? item.Username ?? '',
      email:    item.email    ?? item.Email    ?? '',
      role:     item.role     ?? item.Role     ?? '',
      status:   item.status   ?? item.Status   ?? '',
    } as User));
  }
}
