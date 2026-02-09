package com.viswa.memp.models;

public class Vessel {
    private int id;
    private String name;
    private String imo;
    private String flag;
    private String type;
    private int grossTonnage;

    public Vessel(int id, String name, String imo, String flag, String type, int grossTonnage) {
        this.id = id;
        this.name = name;
        this.imo = imo;
        this.flag = flag;
        this.type = type;
        this.grossTonnage = grossTonnage;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getImo() { return imo; }
    public String getFlag() { return flag; }
    public String getType() { return type; }
    public int getGrossTonnage() { return grossTonnage; }
}