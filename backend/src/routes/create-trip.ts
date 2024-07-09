import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import dayjs from "dayjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips', {
    schema: {
      body: z.object({
        destination: z.string().min(4),
        starts_at: z.coerce.date(),
        ends_at: z.coerce.date(),
        owner_name: z.string(),
        owner_email: z.string().email(),
      })
    }
  }, async (request) => {
    const { destination, starts_at, ends_at, owner_name, owner_email } = request.body;

    if (dayjs(starts_at).isBefore(new Date())) {
      throw new Error('Start date must be in the future');
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
      throw new Error('End date must be after the start date');
    }

    const trip = await prisma.trip.create({
      data: {
        destination,
        starts_at,
        ends_at,
      }
    })

    const mail = await getMailClient();

    const message = await mail.sendMail({
      from: {
        name: 'NoReply Plann.er Team',
        address: 'noreply@plann.er'
      },
      to: {
        name: owner_name,
        address: owner_email
      },
      subject: 'New Trip Created',
      text: `Your trip to ${destination} has been scheduled from ${dayjs(starts_at).format('YYYY-MM-DD')} to ${dayjs(ends_at).format('YYYY-MM-DD')}.`
    });

    console.log(nodemailer.getTestMessageUrl(message));

    return { tripId: trip.id };
  })
}