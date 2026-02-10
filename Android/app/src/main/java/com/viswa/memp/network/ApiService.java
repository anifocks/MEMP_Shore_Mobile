package com.viswa.memp.network;

import com.viswa.memp.model.LoginRequest;
import com.viswa.memp.model.LoginResponse;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.Headers;
import retrofit2.http.POST;

public interface ApiService {

    // Add explicit headers to ensure the server's proxy and body parser handle the request correctly.
    @Headers({
        "Content-Type: application/json",
        "Accept: application/json"
    })
    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);
}
