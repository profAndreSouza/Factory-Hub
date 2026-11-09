package br.com.factoryhub.backend.api;

import br.com.factoryhub.backend.api.dto.PredictionResponse;
import br.com.factoryhub.backend.application.port.OperationalDataPort;
import br.com.factoryhub.backend.application.port.PredictionPort;
import br.com.factoryhub.backend.application.port.TelemetryConsolidationPort;
import br.com.factoryhub.backend.application.port.TelemetryDataPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {FactoryQueryController.class, PredictionController.class})
class ApiContractIntegrationTest {
    @Autowired
    private MockMvc mvc;

    @MockBean
    private OperationalDataPort operationalData;

    @MockBean
    private TelemetryDataPort telemetryData;

    @MockBean
    private TelemetryConsolidationPort consolidationData;

    @MockBean
    private PredictionPort predictionData;

    @Test
    void predictionRouteValidatesPayloadAndReturnsFlaskContract() throws Exception {
        when(predictionData.predict(any())).thenReturn(new PredictionResponse(
                "esp32-torno-01", "RISCO_ANOMALIA", 0.82, "Inspecionar a máquina.",
                "rf-test", Instant.parse("2026-11-09T12:00:00Z"), "TEST"));

        mvc.perform(post("/api/v1/predicoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"device_id":"esp32-torno-01","temperatura":95.0,"vibracao":8.0,"rpm":2500}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status_previsto").value("RISCO_ANOMALIA"))
                .andExpect(jsonPath("$.probabilidade_falha").value(0.82))
                .andExpect(jsonPath("$.modelo_versao").value("rf-test"));

        verify(operationalData).recordPrediction(any(PredictionResponse.class));
    }

    @Test
    void predictionRouteRejectsBlankDeviceId() throws Exception {
        mvc.perform(post("/api/v1/predicoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"device_id":" ","temperatura":70.0,"vibracao":2.0,"rpm":3000}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recentConsolidationRouteCapsRequestedPageSize() throws Exception {
        when(consolidationData.findRecent("esp32-torno-01", 100)).thenReturn(List.of());

        mvc.perform(get("/api/v1/consolidados/esp32-torno-01/recente?limit=500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        verify(consolidationData).findRecent(eq("esp32-torno-01"), eq(100));
    }
}
