# MEMP Shore Mobile

A native Android application for the Marine Emissions Management Platform (MEMP) Shore system.

## Features

- **View-only maritime data access** - Display vessel information, voyage details, compliance reports, and more
- **Material Design UI** - Modern Android interface with intuitive navigation
- **API integration** - Connects to existing MEMP Shore Node.js backend
- **Offline capabilities** - Local data storage and caching

## Modules

- **Dashboard** - Main navigation hub with all available modules
- **MEMP Overview** - Statistics and key performance indicators
- **Vessel Information** - Fleet vessel details and specifications
- **Machinery** - Equipment and machinery monitoring
- **Port Management** - Port operations and logistics
- **Voyage Management** - Voyage tracking and planning
- **Vessel Reports** - Compliance and operational reports
- **Compliances** - Regulatory compliance tracking
- **Additional modules** - Bunker management, additives, user management, fleet management, team management

## Technical Stack

- **Language**: Java
- **Architecture**: Native Android with Activities
- **UI Framework**: Material Design Components
- **Networking**: Retrofit 2.9.0 with Gson
- **Build System**: Gradle with Android Plugin 8.1.4
- **Minimum SDK**: API 21 (Android 5.0)

## Getting Started

1. Clone the repository
2. Open in Android Studio
3. Build and run on device/emulator
4. Configure API endpoint in `ApiClient.java`

## API Configuration

Update the BASE_URL in `app/src/main/java/com/viswa/memp/api/ApiClient.java` to point to your MEMP Shore server.

## Development

This is a view-only application designed to display maritime data from the MEMP Shore system. All data creation and modification operations are handled through the web interface.

## License

Proprietary - MEMP Shore System