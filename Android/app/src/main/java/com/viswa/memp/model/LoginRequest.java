package com.viswa.memp.model;

import com.google.gson.annotations.SerializedName;

public class LoginRequest {

    // The SerializedName annotation ensures the JSON field is named "identifier"
    @SerializedName("identifier")
    private final String identifier;

    @SerializedName("password")
    private final String password;

    public LoginRequest(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }
}
