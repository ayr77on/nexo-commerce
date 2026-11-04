<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;

trait CreatesApplication
{
    /**
     * Creates the application.
     */
    public function createApplication(): Application
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        if ($app->environment('testing') && $app['config']['database.connections.mysql.database'] !== 'nexo_commerce_testing') {
            throw new \RuntimeException('Tests must use the dedicated nexo_commerce_testing database.');
        }

        return $app;
    }
}
