package com.viswa.memp;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import java.util.ArrayList;
import java.util.List;

public class VesselInfoActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private VesselAdapter adapter;
    private List<Vessel> vesselList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vessel_info);

        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("Vessel Information");
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        recyclerView = findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        loadVesselData();
    }

    private void loadVesselData() {
        vesselList = new ArrayList<>();
        // Mock data - in real app, this would come from API
        vesselList.add(new Vessel(1, "MV Ocean Pride", "1234567", "Panama", "Container Ship", 50000));
        vesselList.add(new Vessel(2, "MV Sea Explorer", "2345678", "Liberia", "Bulk Carrier", 80000));
        vesselList.add(new Vessel(3, "MV Blue Wave", "3456789", "Marshall Islands", "Tanker", 60000));

        adapter = new VesselAdapter(vesselList);
        recyclerView.setAdapter(adapter);
    }

    private class VesselAdapter extends RecyclerView.Adapter<VesselAdapter.VesselViewHolder> {

        private List<Vessel> vessels;

        VesselAdapter(List<Vessel> vessels) {
            this.vessels = vessels;
        }

        @NonNull
        @Override
        public VesselViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_vessel, parent, false);
            return new VesselViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull VesselViewHolder holder, int position) {
            Vessel vessel = vessels.get(position);
            holder.bind(vessel);
        }

        @Override
        public int getItemCount() {
            return vessels.size();
        }

        class VesselViewHolder extends RecyclerView.ViewHolder {
            TextView nameText, imoText, flagText, typeText, tonnageText;

            VesselViewHolder(View itemView) {
                super(itemView);
                nameText = itemView.findViewById(R.id.vesselName);
                imoText = itemView.findViewById(R.id.vesselImo);
                flagText = itemView.findViewById(R.id.vesselFlag);
                typeText = itemView.findViewById(R.id.vesselType);
                tonnageText = itemView.findViewById(R.id.vesselTonnage);

                itemView.setOnClickListener(v -> {
                    int position = getAdapterPosition();
                    if (position != RecyclerView.NO_POSITION) {
                        Vessel vessel = vessels.get(position);
                        Intent intent = new Intent(VesselInfoActivity.this, VesselDetailsActivity.class);
                        intent.putExtra("vesselId", vessel.getId());
                        startActivity(intent);
                    }
                });
            }

            void bind(Vessel vessel) {
                nameText.setText(vessel.getName());
                imoText.setText("IMO: " + vessel.getImo());
                flagText.setText("Flag: " + vessel.getFlag());
                typeText.setText("Type: " + vessel.getType());
                tonnageText.setText("GT: " + vessel.getGrossTonnage());
            }
        }
    }

    private static class Vessel {
        private int id;
        private String name;
        private String imo;
        private String flag;
        private String type;
        private int grossTonnage;

        Vessel(int id, String name, String imo, String flag, String type, int grossTonnage) {
            this.id = id;
            this.name = name;
            this.imo = imo;
            this.flag = flag;
            this.type = type;
            this.grossTonnage = grossTonnage;
        }

        int getId() { return id; }
        String getName() { return name; }
        String getImo() { return imo; }
        String getFlag() { return flag; }
        String getType() { return type; }
        int getGrossTonnage() { return grossTonnage; }
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}