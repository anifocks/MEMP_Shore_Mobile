package com.viswa.memp.api;

import com.viswa.memp.models.LoginRequest;
import com.viswa.memp.models.LoginResponse;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface ApiService {

    @POST("auth/login")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);

    // Add more API endpoints as needed
    // @GET("ships/vessels")
    // Call<List<Vessel>> getVessels();
}