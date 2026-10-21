import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { ApiData } from '../common/swagger/api-data.decorator';
import { CountryDto } from '../common/swagger/models';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  // Publique : le front la précharge pour ses listes déroulantes de pays.
  @Get()
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'Liste des pays acceptés (code à 2 lettres, code à 3 lettres, nom)' })
  @ApiData({ type: CountryDto, array: true, description: 'Pays africains puis diaspora, par ordre alphabétique' })
  list() {
    return this.countries.list();
  }
}
