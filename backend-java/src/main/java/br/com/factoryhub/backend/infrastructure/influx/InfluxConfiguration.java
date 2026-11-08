package br.com.factoryhub.backend.infrastructure.influx;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("influx")
public class InfluxConfiguration {
    @Bean(destroyMethod = "close")
    InfluxDBClient influxDBClient(
            @Value("${factoryhub.influx.url}") String url,
            @Value("${factoryhub.influx.token}") String token,
            @Value("${factoryhub.influx.org}") String org,
            @Value("${factoryhub.influx.bucket}") String bucket) {
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("INFLUXDB_TOKEN precisa estar configurado no perfil influx.");
        }
        return InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
    }
}
